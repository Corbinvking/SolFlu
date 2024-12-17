import MockCryptoMarket from './mock-market-data';

describe('MockCryptoMarket', () => {
    let market;
    
    beforeEach(() => {
        market = new MockCryptoMarket();
    });
    
    afterEach(() => {
        market.stop();
    });

    test('initializes with default values', () => {
        expect(market.price).toBe(100);
        expect(market.marketCap).toBe(1000000);
        expect(market.volatility).toBe(0.5);
        expect(market.lastEvent).toBe('normal');
    });

    test('validates state bounds', () => {
        // Test extreme values
        market.marketCap = 100000000000; // Too high
        market.volatility = 2.0; // Too high
        market.trend = 1.0; // Too high
        
        market.validateState();
        
        expect(market.marketCap).toBeLessThanOrEqual(10000000000);
        expect(market.volatility).toBeLessThanOrEqual(1.0);
        expect(market.trend).toBeLessThanOrEqual(0.5);
    });

    test('handles market events correctly', () => {
        const initialVolatility = market.volatility;

        // Test crash event
        market.triggerEvent('crash');
        expect(market.lastEvent).toBe('crash');
        expect(market.price).toBe(80); // 100 * 0.8
        expect(market.volatility).toBeGreaterThan(initialVolatility);

        // Test boom event
        market = new MockCryptoMarket(); // Reset
        market.triggerEvent('boom');
        expect(market.lastEvent).toBe('boom');
        expect(market.price).toBe(120); // 100 * 1.2
        expect(market.volatility).toBeGreaterThan(0.5);

        // Test recovery event
        const volatilityBeforeRecovery = market.volatility;
        market.triggerEvent('recovery');
        expect(market.lastEvent).toBe('recovery');
        expect(market.volatility).toBeLessThan(volatilityBeforeRecovery);
    });

    test('notifies subscribers with correct data format', (done) => {
        market.subscribe((data) => {
            expect(data).toHaveProperty('price');
            expect(data).toHaveProperty('marketCap');
            expect(data).toHaveProperty('volatility');
            expect(data).toHaveProperty('trend');
            expect(data).toHaveProperty('timestamp');
            expect(data).toHaveProperty('eventType');
            expect(data).toHaveProperty('sequence');
            expect(data).toHaveProperty('metrics');
            expect(data.metrics).toHaveProperty('priceChange');
            expect(data.metrics).toHaveProperty('trendStrength');
            expect(data.metrics).toHaveProperty('marketState');
            done();
        });

        market.notifySubscribers();
    });

    test('events expire after duration', (done) => {
        market.eventDuration = 100; // Short duration for testing
        market.triggerEvent('boom');
        
        expect(market.lastEvent).toBe('boom');
        
        setTimeout(() => {
            market.notifySubscribers(); // This should trigger event expiration
            expect(market.lastEvent).toBe('normal');
            done();
        }, 150);
    });

    test('market state determination works correctly', () => {
        // Test highly volatile state
        market.volatility = 0.9;
        expect(market.determineMarketState()).toBe('highly_volatile');

        // Test stable state
        market.volatility = 0.15;
        expect(market.determineMarketState()).toBe('stable');

        // Test bullish state
        market.volatility = 0.5;
        market.trend = 0.4;
        expect(market.determineMarketState()).toBe('bullish');

        // Test bearish state
        market.trend = -0.4;
        expect(market.determineMarketState()).toBe('bearish');

        // Test neutral state
        market.trend = 0;
        expect(market.determineMarketState()).toBe('neutral');
    });
}); 