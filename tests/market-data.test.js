const MarketDataManager = require('../src/components/market-data/MarketDataManager');
const { SpreadStateManager } = require('../src/components/spread/SpreadStateManager');
const { PerformanceMonitor } = require('../src/utils/PerformanceMonitor');

// Mock WebSocket
class MockWebSocket {
    constructor(url) {
        this.url = url;
        this.onopen = null;
        this.onmessage = null;
        this.onerror = null;
        this.onclose = null;
        
        // Simulate connection
        setTimeout(() => this.onopen && this.onopen(), 0);
    }

    close() {}

    // Helper to simulate incoming messages
    simulateMessage(data) {
        if (this.onmessage) {
            this.onmessage({ data: JSON.stringify(data) });
        }
    }
}

global.WebSocket = MockWebSocket;
global.performance = {
    now: () => Date.now()
};

describe('Market Data Processing System', () => {
    let marketDataManager;
    let spreadStateManager;
    let performanceMonitor;

    beforeEach(() => {
        marketDataManager = new MarketDataManager();
        spreadStateManager = new SpreadStateManager();
        performanceMonitor = new PerformanceMonitor();
    });

    afterEach(() => {
        if (marketDataManager) {
            marketDataManager.disconnect();
        }
        if (performanceMonitor) {
            performanceMonitor.stopMonitoring();
        }
    });

    test('MarketDataManager establishes WebSocket connection', (done) => {
        marketDataManager.on('connected', () => {
            expect(marketDataManager.socket).toBeTruthy();
            done();
        });
    });

    test('MarketDataManager handles market updates correctly', (done) => {
        const testData = {
            marketCap: 1000000,
            volatility: 0.5,
            routes: ['route1', 'route2'],
            infectionCenters: [
                ['center1', { lat: 0, lng: 0, intensity: 0.5 }]
            ]
        };

        marketDataManager.on('stateUpdate', (state) => {
            expect(state.marketCap).toBe(testData.marketCap);
            expect(state.volatility).toBe(testData.volatility);
            expect(state.routes.size).toBe(2);
            expect(state.infectionCenters.size).toBe(1);
            done();
        });

        marketDataManager.socket.simulateMessage(testData);
    });

    test('SpreadStateManager processes market updates within performance limits', () => {
        const startTime = performance.now();
        
        spreadStateManager.processMarketUpdate({
            marketCap: 1000000,
            volatility: 0.5,
            routes: new Set(['route1']),
            infectionCenters: new Map([
                ['center1', { lat: 0, lng: 0, intensity: 0.5 }]
            ])
        });

        const processingTime = performance.now() - startTime;
        expect(processingTime).toBeLessThan(16); // Should process within 16ms
    });

    test('UpdateQueue maintains frame rate', async () => {
        const { UpdateQueue } = require('../src/components/spread/SpreadStateManager');
        const queue = new UpdateQueue();
        const updates = [];

        // Add multiple updates
        for (let i = 0; i < 5; i++) {
            updates.push({
                type: 'spread',
                data: { spreadRate: 0.1 * i },
                priority: 'normal'
            });
        }

        const startTime = performance.now();
        updates.forEach(update => queue.addUpdate(update));
        
        // Wait for queue processing
        await new Promise(resolve => setTimeout(resolve, 100));

        const processingTime = performance.now() - startTime;
        const expectedMinTime = (updates.length * (1000 / 60)); // Minimum time based on 60 FPS
        
        expect(processingTime).toBeGreaterThanOrEqual(expectedMinTime);
    });

    test('PerformanceMonitor tracks metrics correctly', () => {
        performanceMonitor.trackMarketUpdate(0, 10); // 10ms update
        performanceMonitor.trackSpreadCalculation(5); // 5ms calculation
        performanceMonitor.updateFPS();

        const analysis = performanceMonitor.analyze();
        
        expect(analysis.marketUpdateLatency).toBe(10);
        expect(analysis.spreadUpdateTime).toBe(5);
        expect(analysis.performance).toBeGreaterThan(0);
    });

    test('System handles rapid market updates', (done) => {
        let updateCount = 0;
        const updates = [];

        marketDataManager.on('stateUpdate', (state) => {
            updates.push(state);
            updateCount++;

            if (updateCount === 10) {
                expect(updates.length).toBe(10);
                expect(updates.every(update => update.marketCap > 0)).toBe(true);
                done();
            }
        });

        // Simulate 10 rapid updates
        for (let i = 0; i < 10; i++) {
            marketDataManager.socket.simulateMessage({
                marketCap: 1000000 + (i * 100000),
                volatility: 0.5 + (i * 0.05),
                routes: [`route${i}`],
                infectionCenters: [
                    [`center${i}`, { lat: i, lng: i, intensity: 0.5 }]
                ]
            });
        }
    });
}); 