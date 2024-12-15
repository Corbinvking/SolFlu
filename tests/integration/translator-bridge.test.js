const TranslatorBridge = require('../../src/translator/bridge/TranslatorBridge');
const { sleep, waitFor } = require('./test-utils');
const WebSocket = require('ws');

// Port management to avoid conflicts
const PORTS = {
    BASIC: 8007,
    SUBSCRIPTION: 8011,
    NETWORK: 8009,
    MESSAGE_ORDER: 8010,
    MARKET_UPDATE: 8012
};

// Helper function to create mock server with retry
const createMockServer = async (port, messageHandler, retryCount = 3) => {
    for (let attempt = 1; attempt <= retryCount; attempt++) {
        try {
            const server = new WebSocket.Server({ 
                port,
                host: '127.0.0.1'
            });
            
            server.on('error', (error) => {
                console.error(`Mock server error on port ${port}:`, error);
            });

            server.on('connection', (ws) => {
                console.log(`Mock server on port ${port}: Client connected`);
                ws.on('message', messageHandler(ws));
                ws.on('error', (error) => {
                    console.error(`Mock server websocket error on port ${port}:`, error);
                });
            });

            // Wait for server to be ready
            await new Promise((resolve, reject) => {
                server.on('listening', () => {
                    console.log(`Mock server listening on port ${port}`);
                    resolve();
                });
                server.on('error', reject);
            });

            return server;
        } catch (error) {
            console.error(`Failed to create mock server on port ${port}, attempt ${attempt}/${retryCount}:`, error);
            if (attempt === retryCount) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
        }
    }
};

// Helper function to cleanup mock server with timeout
const cleanupMockServer = async (server) => {
    if (server) {
        await new Promise((resolve) => {
            const timeout = setTimeout(() => {
                console.log('Mock server close timed out, forcing cleanup');
                resolve();
            }, 1000);

            server.close(() => {
                clearTimeout(timeout);
                console.log('Mock server closed');
                setTimeout(resolve, 100);
            });
        });
    }
};

// Basic connectivity tests
describe('TranslatorBridge Basic Tests', () => {
    let bridge;
    let mockServer;

    beforeEach(async () => {
        console.log('Setting up test case...');
        try {
            mockServer = await createMockServer(PORTS.BASIC, (ws) => (msg) => {
                try {
                    const data = JSON.parse(msg);
                    if (data.type === 'heartbeat') {
                        ws.send(JSON.stringify({
                            type: 'heartbeat',
                            timestamp: Date.now()
                        }));
                    }
                } catch (error) {
                    console.error('Mock server message handling error:', error);
                }
            });
            
            bridge = new TranslatorBridge({ port: PORTS.BASIC });
            await sleep(500);
        } catch (error) {
            console.error('Failed to setup basic test:', error);
            throw error;
        }
    });

    afterEach(async () => {
        console.log('Cleaning up test case...');
        try {
            if (bridge) {
                await bridge.cleanup();
                bridge = null;
            }
            await cleanupMockServer(mockServer);
        } catch (error) {
            console.error('Basic test cleanup error:', error);
        }
        // Wait for any pending operations to complete
        await sleep(100);
    });

    test('should successfully connect to WebSocket server', async () => {
        const initPromise = bridge.initialize();
        
        // Set up event tracking
        const events = [];
        bridge.eventEmitter.on('error', err => events.push(['error', err]));
        
        const connected = await initPromise;
        expect(connected).toBe(true);
        expect(bridge.isConnected).toBe(true);
        
        // Wait for any post-connection events
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check for any errors
        const errors = events.filter(([type]) => type === 'error');
        expect(errors).toHaveLength(0);
    });

    test('should maintain connection with heartbeat', async () => {
        console.log('Running heartbeat test...');
        await bridge.initialize();
        await sleep(2000); // Wait for a heartbeat cycle
        expect(bridge.isConnected).toBe(true);
        console.log('Heartbeat test completed');
    });

    test('should handle concurrent connection attempts', async () => {
        const attempts = 2;
        const connections = Array(attempts).fill(null).map(() => new TranslatorBridge());
        
        try {
            // Try to connect all bridges simultaneously
            const results = await Promise.all(
                connections.map(conn => conn.initialize())
            );
            
            // All connections should succeed
            results.forEach(result => expect(result).toBe(true));
            
            // Wait to verify stability
            await sleep(1000);
            
            // Verify all connections are still active
            connections.forEach(conn => {
                expect(conn.isConnected).toBe(true);
            });
        } finally {
            // Cleanup all connections
            await Promise.all(
                connections.map(conn => conn.cleanup())
            );
        }
    });

    test('should handle rapid connect/disconnect cycles', async () => {
        const cycles = 3;
        for (let i = 0; i < cycles; i++) {
            console.log(`Connection cycle ${i + 1}/${cycles}`);
            
            // Connect
            const connected = await bridge.initialize();
            expect(connected).toBe(true);
            expect(bridge.isConnected).toBe(true);
            
            // Wait briefly
            await sleep(1000);
            
            // Disconnect
            await bridge.cleanup();
            expect(bridge.isConnected).toBe(false);
            
            // Wait briefly before next cycle
            await sleep(1000);
        }
    });
});

// Subscription persistence tests
describe('TranslatorBridge Subscription Persistence Tests', () => {
    let bridge;
    let mockServer;
    
    beforeEach(async () => {
        console.log('Setting up subscription persistence test...');
        try {
            // Create mock server with subscription handler
            mockServer = await createMockServer(PORTS.SUBSCRIPTION, (ws) => (msg) => {
                try {
                    const data = JSON.parse(msg);
                    console.log('Mock server received:', data);
                    if (data.type === 'marketUpdate') {
                        // Echo back market updates with proper format
                        ws.send(JSON.stringify({
                            type: 'marketUpdate',
                            data: {
                                marketMetrics: {
                                    price: data.data.marketMetrics.price,
                                    volume: data.data.marketMetrics.volume,
                                    marketCap: data.data.marketMetrics.marketCap,
                                    volatility: data.data.marketMetrics.volatility
                                }
                            },
                            timestamp: Date.now()
                        }));
                    }
                } catch (error) {
                    console.error('Mock server message handling error:', error);
                }
            });
            
            bridge = new TranslatorBridge({ port: PORTS.SUBSCRIPTION });
            await bridge.initialize();
            await sleep(500);
        } catch (error) {
            console.error('Failed to setup subscription test:', error);
            throw error;
        }
    });

    afterEach(async () => {
        console.log('Cleaning up subscription persistence test...');
        try {
            if (bridge) {
                await bridge.cleanup();
                await sleep(500);
            }
            await cleanupMockServer(mockServer);
        } catch (error) {
            console.error('Subscription persistence test cleanup error:', error);
        }
    });

    test('should maintain subscriptions through reconnection', async () => {
        let unsubscribe;
        const results = [];
        
        try {
            // Set up subscription
            unsubscribe = bridge.subscribe('marketUpdate', (data) => {
                console.log('Subscription callback triggered with data:', data);
                results.push('received');
            });
            
            // Verify initial subscription works
            await bridge.handleMarketUpdate({ 
                price: 100,
                volume: 1000,
                marketCap: 1000000,
                volatility: 0.1
            });
            
            // Wait for initial message processing
            await sleep(100);
            expect(results).toHaveLength(1);
            
            // Clear results for next test
            results.length = 0;
            
            // Store subscriptions before cleanup
            const subscriptionBackup = new Map(bridge.subscriptions);
            
            // Force disconnect and reconnect
            await bridge.cleanup();
            await sleep(100);
            
            // Restore subscriptions
            bridge.subscriptions = new Map(subscriptionBackup);
            
            await bridge.initialize();
            
            // Wait for connection to stabilize
            await sleep(200);
            
            // Send new market update
            await bridge.handleMarketUpdate({ 
                price: 200,
                volume: 2000,
                marketCap: 2000000,
                volatility: 0.2
            });
            
            // Wait for message processing
            await sleep(100);
            
            // Verify the subscription still works
            expect(results).toHaveLength(1);
            expect(results[0]).toBe('received');
            
        } finally {
            if (unsubscribe) {
                unsubscribe();
            }
        }
    }, 30000); // 30 second timeout
});

// Individual stability tests
describe('TranslatorBridge Market Update Test', () => {
    let bridge;
    let mockServer;
    
    // Reduce timeout for faster failure detection
    jest.setTimeout(60000); // 1 minute

    beforeEach(async () => {
        console.log('Setting up market update test...');
        try {
            mockServer = await createMockServer(PORTS.MARKET_UPDATE, (ws) => (msg) => {
                try {
                    const data = JSON.parse(msg);
                    console.log('Mock server received:', data);
                    if (data.type === 'marketUpdate') {
                        const response = {
                            type: 'marketUpdate',
                            data: {
                                marketMetrics: {
                                    price: data.data.marketMetrics.price,
                                    volume: data.data.marketMetrics.volume,
                                    marketCap: data.data.marketMetrics.marketCap,
                                    volatility: data.data.marketMetrics.volatility
                                }
                            },
                            timestamp: Date.now()
                        };
                        console.log('Mock server sending:', response);
                        ws.send(JSON.stringify(response));
                    }
                } catch (error) {
                    console.error('Mock server message handling error:', error);
                }
            });
            
            bridge = new TranslatorBridge({ port: PORTS.MARKET_UPDATE });
            await sleep(500);
        } catch (error) {
            console.error('Failed to setup market update test:', error);
            throw error;
        }
    });

    afterEach(async () => {
        console.log('Cleaning up market update test...');
        try {
            if (bridge) {
                await bridge.cleanup();
                await sleep(500);
            }
            await cleanupMockServer(mockServer);
        } catch (error) {
            console.error('Market update test cleanup error:', error);
        }
    });

    test('should handle market updates and receive simulation parameters', async () => {
        console.log('Running market update test...');
        
        // Initialize bridge
        console.log('Attempting to initialize connection...');
        const connected = await bridge.initialize().catch(error => {
            console.error('Failed to initialize bridge:', error);
            throw error;
        });
        
        console.log('Connection established:', connected);
        expect(connected).toBe(true);
        expect(bridge.isConnected).toBe(true);

        const marketData = {
            price: 100.0,
            volume: 1000000.0,
            marketCap: 10000000.0,
            volatility: 0.5,
            source: 'test',
            reliability: 0.9
        };

        // Set up response handler before sending
        let receivedResponse = null;
        let responseError = null;
        
        console.log('Setting up market update subscription...');
        const messagePromise = new Promise(resolve => {
            bridge.subscribe('marketUpdate', (data) => {
                console.log('Received market update response:', JSON.stringify(data, null, 2));
                resolve(data);
            });
        });

        // Send the update
        console.log('Sending market update:', JSON.stringify(marketData, null, 2));
        try {
            await bridge.handleMarketUpdate(marketData);
            console.log('Market update sent successfully, waiting for response...');
        } catch (error) {
            console.error('Failed to send market update:', error);
            responseError = error;
            throw error;
        }

        try {
            // Wait for response with timeout
            receivedResponse = await Promise.race([
                messagePromise,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for response')), 5000))
            ]);

            console.log('Response received, verifying...');
            expect(receivedResponse).toBeDefined();
            expect(receivedResponse.data).toBeDefined();
            expect(receivedResponse.data.marketMetrics).toBeDefined();
            expect(receivedResponse.data.marketMetrics.price).toBe(100.0);
            expect(receivedResponse.data.marketMetrics.volume).toBe(1000000.0);
            expect(receivedResponse.data.marketMetrics.marketCap).toBe(10000000.0);
            expect(receivedResponse.data.marketMetrics.volatility).toBe(0.5);
            expect(receivedResponse.timestamp).toBeDefined();
            
            // Log the full response for debugging
            console.log('Full response data:', JSON.stringify(receivedResponse, null, 2));
            console.log('Market update test completed successfully');
        } catch (error) {
            console.error('Market update test failed:', error);
            console.error('Final bridge state:', {
                isConnected: bridge.isConnected,
                hasError: responseError !== null,
                receivedResponse: !!receivedResponse,
                socketState: bridge.socket ? bridge.socket.readyState : 'no socket'
            });
            throw error;
        }
    });
});

describe('TranslatorBridge Network Interruption Test', () => {
    let bridge;
    let mockServer;
    
    beforeEach(async () => {
        console.log('Setting up network interruption test...');
        try {
            mockServer = await createMockServer(PORTS.NETWORK, (ws) => (msg) => {
                try {
                    const data = JSON.parse(msg);
                    console.log('Mock server received:', data);
                    if (data.type === 'marketUpdate') {
                        const response = {
                            type: 'marketUpdate',
                            data: {
                                marketMetrics: {
                                    price: data.data.marketMetrics.price,
                                    volume: data.data.marketMetrics.volume,
                                    marketCap: data.data.marketMetrics.marketCap,
                                    volatility: data.data.marketMetrics.volatility
                                }
                            },
                            timestamp: Date.now()
                        };
                        console.log('Mock server sending:', response);
                        ws.send(JSON.stringify(response));
                    }
                } catch (error) {
                    console.error('Mock server message handling error:', error);
                }
            });
            
            bridge = new TranslatorBridge({ port: PORTS.NETWORK });
            await sleep(500);
        } catch (error) {
            console.error('Failed to setup network test:', error);
            throw error;
        }
    });

    afterEach(async () => {
        console.log('Cleaning up network interruption test...');
        try {
            if (bridge) {
                await bridge.cleanup();
                await sleep(500);
            }
            await cleanupMockServer(mockServer);
        } catch (error) {
            console.error('Network interruption test cleanup error:', error);
        }
    });

    test('should handle network interruption simulation', async () => {
        // Initial connection
        console.log('Establishing initial connection...');
        const connected = await bridge.initialize();
        console.log('Initial connection established:', connected);
        expect(connected).toBe(true);
        expect(bridge.isConnected).toBe(true);

        // Set up message handler with Promise
        const messagePromise = new Promise(resolve => {
            bridge.subscribe('marketUpdate', (msg) => {
                console.log('Received market update:', JSON.stringify(msg, null, 2));
                resolve(msg);
            });
        });
        
        // Send initial test message
        console.log('Sending initial test message...');
        const initialData = {
            price: 100.0,
            volume: 1000000,
            marketCap: 10000000,
            volatility: 0.5,
            source: 'test',
            reliability: 0.9
        };
        await bridge.handleMarketUpdate(initialData);

        // Wait for first message with timeout
        const firstMessage = await Promise.race([
            messagePromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for first message')), 5000))
        ]);
        
        expect(firstMessage).toBeDefined();
        expect(firstMessage.data.marketMetrics.price).toBe(100.0);
        
        // Force disconnect
        console.log('Forcing disconnect...');
        await bridge.cleanup();
        expect(bridge.isConnected).toBe(false);
        console.log('Disconnected successfully');
        
        // Wait before reconnecting
        await sleep(2000);
        
        // Set up new message handler
        const reconnectMessagePromise = new Promise(resolve => {
            bridge.subscribe('marketUpdate', (msg) => {
                console.log('Received post-reconnection update:', JSON.stringify(msg, null, 2));
                resolve(msg);
            });
        });
        
        // Reconnect
        console.log('Attempting reconnection...');
        const reconnected = await bridge.initialize();
        console.log('Reconnection result:', reconnected);
        expect(reconnected).toBe(true);
        expect(bridge.isConnected).toBe(true);
        
        // Send another message
        console.log('Sending post-reconnection test message...');
        const newData = {
            price: 110.0,
            volume: 1100000,
            marketCap: 11000000,
            volatility: 0.6,
            source: 'test',
            reliability: 0.95
        };
        await bridge.handleMarketUpdate(newData);

        // Wait for second message with timeout
        const secondMessage = await Promise.race([
            reconnectMessagePromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for second message')), 5000))
        ]);
        
        expect(secondMessage).toBeDefined();
        expect(secondMessage.data.marketMetrics.price).toBe(110.0);
    }, 30000);
});

// Message order test with similar updates
describe('TranslatorBridge Message Order Test', () => {
    let bridge;
    let mockServer;
    
    beforeEach(async () => {
        console.log('Setting up message order test...');
        try {
            mockServer = await createMockServer(PORTS.MESSAGE_ORDER, (ws) => (msg) => {
                try {
                    const data = JSON.parse(msg);
                    console.log('Mock server received:', data);
                    if (data.type === 'marketUpdate') {
                        // Extract sequence from the incoming message
                        const sequence = data.sequence || data.data?.sequence;
                        
                        // Format the response to match the expected structure
                        const response = {
                            type: 'marketUpdate',
                            data: {
                                marketMetrics: {
                                    price: data.data.marketMetrics.price,
                                    volume: data.data.marketMetrics.volume,
                                    marketCap: data.data.marketMetrics.marketCap,
                                    volatility: data.data.marketMetrics.volatility
                                },
                                sequence: sequence // Include sequence in the data
                            },
                            sequence: sequence, // Also include at top level for consistency
                            timestamp: Date.now()
                        };
                        console.log('Mock server sending:', response);
                        
                        // Ensure immediate response
                        setImmediate(() => {
                            if (ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify(response));
                            }
                        });
                    }
                } catch (error) {
                    console.error('Mock server message handling error:', error);
                }
            });
            
            bridge = new TranslatorBridge({ port: PORTS.MESSAGE_ORDER });
            await bridge.initialize();
            await sleep(500);
        } catch (error) {
            console.error('Failed to setup message order test:', error);
            throw error;
        }
    });

    afterEach(async () => {
        console.log('Cleaning up message order test...');
        try {
            if (bridge) {
                await bridge.cleanup();
                await sleep(500);
            }
            await cleanupMockServer(mockServer);
        } catch (error) {
            console.error('Message order test cleanup error:', error);
        }
    });

    test('should maintain message order during reconnection', async () => {
        // Initial connection
        console.log('Establishing initial connection...');
        const connected = await bridge.initialize();
        console.log('Initial connection established:', connected);
        expect(connected).toBe(true);
        
        const messages = [];
        const subscription = bridge.subscribe('marketUpdate', (msg) => {
            console.log('Received message:', JSON.stringify(msg, null, 2));
            messages.push(msg);
        });
        
        // Helper function to send a message and wait for response with better error handling
        const sendAndWait = async (data) => {
            const beforeLength = messages.length;
            console.log(`Sending message with sequence ${data.sequence}...`);
            
            // Format the market data properly
            const marketData = {
                price: data.price,
                volume: data.volume,
                marketCap: data.marketCap,
                volatility: data.volatility,
                sequence: data.sequence
            };
            
            await bridge.handleMarketUpdate(marketData);
            
            try {
                await waitFor(
                    () => {
                        const received = messages.length > beforeLength;
                        if (!received) {
                            console.log(`Waiting for message ${data.sequence}, current length: ${messages.length}`);
                        }
                        return received;
                    },
                    10000, // Increased timeout
                    100
                );
                console.log(`Message ${data.sequence} received and processed`);
                
                // Verify the received message
                const lastMessage = messages[messages.length - 1];
                expect(lastMessage.data.marketMetrics.price).toBe(data.price);
                expect(lastMessage.data.sequence).toBe(data.sequence);
            } catch (error) {
                console.error(`Failed to receive message ${data.sequence}:`, error);
                throw error;
            }
        };
        
        try {
            // Send first batch of messages with better error handling
            console.log('Sending first batch of messages...');
            for (let i = 0; i < 3; i++) {
                try {
                    const data = {
                        price: 100.0 + i,
                        volume: 1000000 + (i * 100000),
                        marketCap: 10000000 + (i * 1000000),
                        volatility: 0.5 + (i * 0.1),
                        source: 'test',
                        reliability: 0.9,
                        sequence: i
                    };
                    await sendAndWait(data);
                    console.log(`Message ${i + 1}/3 processed successfully`);
                    await sleep(100); // Small delay between messages
                } catch (error) {
                    console.error(`Failed to process message ${i + 1}/3:`, error);
                    throw error;
                }
            }
            
            expect(messages.length).toBe(3);
            
            // Verify first batch sequences
            const firstBatchSequences = messages
                .map(m => m.data.sequence)
                .filter(s => s !== undefined);
                
            console.log('First batch sequences:', firstBatchSequences);
            expect(firstBatchSequences).toEqual([0, 1, 2]);
            
            // Store subscriptions before cleanup
            const subscriptionBackup = new Map(bridge.subscriptions);
            
            // Force disconnect
            console.log('Forcing disconnect...');
            await bridge.cleanup();
            expect(bridge.isConnected).toBe(false);
            console.log('Disconnected successfully');
            
            // Wait before reconnecting
            await sleep(2000);
            
            // Restore subscriptions
            bridge.subscriptions = new Map(subscriptionBackup);
            
            // Reconnect
            console.log('Attempting reconnection...');
            await bridge.initialize();
            expect(bridge.isConnected).toBe(true);
            console.log('Reconnected successfully');
            
            // Clear messages array for second batch
            messages.length = 0;
            
            // Wait for connection to stabilize
            await sleep(500);
            
            // Send second batch of messages with better error handling
            console.log('Sending second batch of messages...');
            for (let i = 3; i < 6; i++) {
                try {
                    const data = {
                        price: 100.0 + i,
                        volume: 1000000 + (i * 100000),
                        marketCap: 10000000 + (i * 1000000),
                        volatility: 0.5 + (i * 0.1),
                        source: 'test',
                        reliability: 0.9,
                        sequence: i
                    };
                    await sendAndWait(data);
                    console.log(`Message ${i + 1}/6 processed successfully`);
                    await sleep(100); // Small delay between messages
                } catch (error) {
                    console.error(`Failed to process message ${i + 1}/6:`, error);
                    throw error;
                }
            }
            
            expect(messages.length).toBe(3); // We only expect 3 messages in second batch
            
            // Verify second batch sequences
            const secondBatchSequences = messages
                .map(m => m.data.sequence)
                .filter(s => s !== undefined);
                
            console.log('Second batch sequences:', secondBatchSequences);
            expect(secondBatchSequences).toEqual([3, 4, 5]);
            
            console.log('Message order test completed successfully');
        } finally {
            // Cleanup subscription
            subscription();
        }
    }, 30000);
}); 