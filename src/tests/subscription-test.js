const TranslatorBridge = require('../translator/bridge/TranslatorBridge');
const WebSocket = require('ws');

describe('TranslatorBridge Subscription Tests', () => {
    let bridge;
    let mockServer;
    
    beforeEach(async () => {
        // Create a test WebSocket server
        mockServer = new WebSocket.Server({ port: 8008 });
        mockServer.on('connection', (ws) => {
            ws.on('message', (msg) => {
                // Echo back market updates for testing
                const data = JSON.parse(msg);
                if (data.type === 'marketUpdate') {
                    ws.send(JSON.stringify(data));
                }
            });
        });
        
        bridge = new TranslatorBridge();
        await bridge.initialize();
    });
    
    afterEach(async () => {
        await bridge.cleanup();
        await new Promise(resolve => mockServer.close(resolve));
    });
    
    test('basic subscription functionality', (done) => {
        let callCount = 0;
        const unsubscribe = bridge.subscribe('marketUpdate', (data) => {
            callCount++;
            expect(data.type).toBe('marketUpdate');
            if (callCount === 1) {
                unsubscribe();
                done();
            }
        });
        
        bridge.handleMarketUpdate({ price: 100 });
    });
    
    test('multiple subscriptions', async () => {
        const results = [];
        const sub1 = bridge.subscribe('marketUpdate', (data) => results.push('sub1'));
        const sub2 = bridge.subscribe('marketUpdate', (data) => results.push('sub2'));
        
        await bridge.handleMarketUpdate({ price: 100 });
        
        expect(results).toHaveLength(2);
        expect(results).toContain('sub1');
        expect(results).toContain('sub2');
        
        sub1();
        sub2();
    });
    
    test('subscription persistence through reconnection', async () => {
        const results = [];
        const unsubscribe = bridge.subscribe('marketUpdate', (data) => {
            results.push('received');
        });
        
        // Force disconnect
        await bridge.cleanup();
        await bridge.initialize();
        
        await bridge.handleMarketUpdate({ price: 100 });
        
        expect(results).toHaveLength(1);
        unsubscribe();
    });
    
    test('cleanup removes all subscriptions', async () => {
        const results = [];
        bridge.subscribe('marketUpdate', (data) => results.push('should not be called'));
        
        await bridge.cleanup();
        await bridge.initialize();
        
        await bridge.handleMarketUpdate({ price: 100 });
        expect(results).toHaveLength(0);
    });
}); 