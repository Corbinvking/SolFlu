import MarketSimulator from './market-simulator';

describe('MarketSimulator', () => {
    let simulator;

    beforeEach(() => {
        simulator = new MarketSimulator({
            initialMarketCap: 2000,
            initialPrice: 0.0001,
            initialSupply: 20000000
        });
    });

    afterEach(() => {
        simulator.stop();
    });

    test('initializes with correct values', () => {
        expect(simulator.state.marketCap).toBe(2000);
        expect(simulator.state.price).toBe(0.0001);
        expect(simulator.state.supply).toBe(20000000);
        expect(simulator.state.phase).toBe('initial');
    });

    test('calculates metrics correctly', () => {
        const deltaTime = 1000; // 1 second
        const metrics = simulator.calculateMetrics(deltaTime);

        expect(metrics.marketCap).toBeGreaterThan(0);
        expect(metrics.price).toBeGreaterThan(0);
        expect(metrics.volume24h).toBeGreaterThan(0);
        expect(metrics.holders).toBeGreaterThanOrEqual(10);
    });

    test('respects growth limits', () => {
        const dayInMs = 24 * 60 * 60 * 1000;
        const metrics = simulator.calculateMetrics(dayInMs);

        const growthRate = (metrics.marketCap - simulator.state.marketCap) / simulator.state.marketCap;
        expect(growthRate).toBeLessThanOrEqual(simulator.config.maxDailyGrowth);
        expect(growthRate).toBeGreaterThanOrEqual(-simulator.config.maxDailyLoss);
    });

    test('generates market events', () => {
        // Force an event
        simulator.eventProbability = 1;
        simulator.generateMarketEvent();

        expect(simulator.events.length).toBeGreaterThan(0);
        const event = simulator.events[0];
        expect(event).toHaveProperty('type');
        expect(event).toHaveProperty('timestamp');
        expect(event).toHaveProperty('impact');
    });

    test('advances phases correctly', () => {
        const originalPhase = simulator.state.phase;
        
        // Force phase advancement
        simulator.state.phaseStartTime = Date.now() - simulator.state.phaseDuration - 1000;
        simulator.update();

        expect(simulator.state.phase).not.toBe(originalPhase);
    });

    test('maintains price history', () => {
        for (let i = 0; i < 5; i++) {
            simulator.update();
        }

        expect(simulator.state.priceHistory.length).toBeGreaterThan(0);
        expect(simulator.state.volumeHistory.length).toBeGreaterThan(0);
    });

    test('simulates organic growth pattern', async () => {
        const dataPoints = [];
        
        // Collect 1 hour of data
        for (let i = 0; i < 60; i++) {
            simulator.update();
            dataPoints.push({
                marketCap: simulator.state.marketCap,
                price: simulator.state.price,
                holders: simulator.state.holders
            });
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Verify organic growth patterns
        let increasingTrend = 0;
        for (let i = 1; i < dataPoints.length; i++) {
            if (dataPoints[i].marketCap > dataPoints[i-1].marketCap) {
                increasingTrend++;
            }
        }

        // Should have more increases than decreases in early phase
        expect(increasingTrend).toBeGreaterThan(dataPoints.length * 0.5);
    });

    test('handles market sentiment', () => {
        const initialSentiment = simulator.state.marketSentiment;
        
        // Simulate positive event
        simulator.generateMarketEvent();
        
        expect(simulator.state.marketSentiment).not.toBe(initialSentiment);
        expect(simulator.state.marketSentiment).toBeGreaterThanOrEqual(0);
        expect(simulator.state.marketSentiment).toBeLessThanOrEqual(1);
    });

    test('calculates momentum correctly', () => {
        // Add some price history
        for (let i = 0; i < 25; i++) {
            simulator.state.priceHistory.push(0.0001 * (1 + i * 0.1));
        }

        const momentum = simulator.calculateMomentum();
        expect(momentum).not.toBe(0);
    });
});

// Integration test
describe('MarketSimulator Integration', () => {
    test('simulates realistic market behavior', async () => {
        const simulator = new MarketSimulator();
        const timePoints = [];
        
        // Run simulation for 5 minutes
        simulator.start();
        
        for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            timePoints.push({
                marketCap: simulator.state.marketCap,
                price: simulator.state.price,
                volume24h: simulator.state.volume24h,
                holders: simulator.state.holders,
                phase: simulator.state.phase
            });
        }
        
        simulator.stop();

        // Verify realistic patterns
        expect(timePoints.length).toBe(5);
        
        // Check for reasonable value ranges
        timePoints.forEach(point => {
            expect(point.marketCap).toBeGreaterThan(0);
            expect(point.price).toBeGreaterThan(0);
            expect(point.volume24h).toBeGreaterThanOrEqual(0);
            expect(point.holders).toBeGreaterThanOrEqual(10);
        });

        // Verify growth patterns
        const growthRates = timePoints.map((point, i) => {
            if (i === 0) return 0;
            return (point.marketCap - timePoints[i-1].marketCap) / timePoints[i-1].marketCap;
        }).slice(1);

        // Check for reasonable growth rates
        growthRates.forEach(rate => {
            expect(Math.abs(rate)).toBeLessThan(0.5); // No extreme changes in short time
        });
    });
}); 