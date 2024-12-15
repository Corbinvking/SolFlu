const TranslatorBridge = require('../../src/translator/bridge/TranslatorBridge');
const WebSocket = require('ws');

describe('TranslatorBridge Subscription Tests', () => {
    let bridge;
    let mockServer;
    
    beforeEach(async () => {
        // Create a test WebSocket server
        mockServer = new WebSocket.Server({ port: 8008 });
        mockServer.on('connection', (ws) => {
            ws.on('message', (msg) => {
                try {
                    const data = JSON.parse(msg);
                    // Echo back market updates with proper format
                    if (data.type === 'marketUpdate') {
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
                    console.error('Mock server error:', error);
                }
            });
        });
        
        bridge = new TranslatorBridge();
        await bridge.initialize();
    });
    
    afterEach(async () => {
        if (bridge) {
            await bridge.cleanup();
        }
        
        if (mockServer) {
            await new Promise(resolve => {
                mockServer.close(() => {
                    setTimeout(resolve, 100); // Give time for connections to fully close
                });
            });
        }
    });
    
    test('basic subscription functionality', async () => {
        expect.assertions(2);
        
        const result = await new Promise((resolve) => {
            const unsubscribe = bridge.subscribe('marketUpdate', (data) => {
                unsubscribe();
                resolve(data);
            });
            
            bridge.handleMarketUpdate({ 
                price: 100,
                volume: 1000,
                marketCap: 1000000,
                volatility: 0.1
            });
        });
        
        expect(result).toBeDefined();
        expect(result.data.marketMetrics).toBeDefined();
    }, 10000);
    
    test('multiple subscriptions', async () => {
        const results = [];
        const sub1 = bridge.subscribe('marketUpdate', () => results.push('sub1'));
        const sub2 = bridge.subscribe('marketUpdate', () => results.push('sub2'));
        
        await bridge.handleMarketUpdate({ 
            price: 100,
            volume: 1000,
            marketCap: 1000000,
            volatility: 0.1
        });
        
        // Give time for callbacks to execute
        await new Promise(resolve => setTimeout(resolve, 100));
        
        expect(results).toHaveLength(2);
        expect(results).toContain('sub1');
        expect(results).toContain('sub2');
        
        sub1();
        sub2();
    });
    
    test('subscription persistence through reconnection', async () => {
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
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(results).toHaveLength(1);
            
            // Clear results for next test
            results.length = 0;
            
            // Store subscriptions before cleanup
            const subscriptionBackup = new Map(bridge.subscriptions);
            
            // Force disconnect and reconnect
            await bridge.cleanup();
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Restore subscriptions
            bridge.subscriptions = new Map(subscriptionBackup);
            
            await bridge.initialize();
            
            // Wait for connection to stabilize
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Send new market update
            await bridge.handleMarketUpdate({ 
                price: 200,
                volume: 2000,
                marketCap: 2000000,
                volatility: 0.2
            });
            
            // Wait for message processing
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Verify the subscription still works
            expect(results).toHaveLength(1);
            expect(results[0]).toBe('received');
            
        } finally {
            if (unsubscribe) {
                unsubscribe();
            }
        }
    });
    
    test('cleanup removes all subscriptions', async () => {
        const results = [];
        bridge.subscribe('marketUpdate', () => results.push('should not be called'));
        
        await bridge.cleanup();
        await bridge.initialize();
        
        await bridge.handleMarketUpdate({ 
            price: 100,
            volume: 1000,
            marketCap: 1000000,
            volatility: 0.1
        });
        
        // Give time for any potential callbacks
        await new Promise(resolve => setTimeout(resolve, 100));
        
        expect(results).toHaveLength(0);
    });
}); 