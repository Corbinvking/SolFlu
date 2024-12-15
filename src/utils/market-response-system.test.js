import MarketResponseSystem from './market-response-system';

describe('MarketResponseSystem', () => {
    let responseSystem;
    
    beforeEach(() => {
        responseSystem = new MarketResponseSystem();
    });

    describe('Market Crash Response', () => {
        test('should detect market crash conditions', () => {
            const marketState = {
                trend: -0.35, // Strong negative trend
                volatility: 0.8, // High volatility
                volume: 0.9
            };

            const effects = responseSystem.processMarketUpdate(marketState);
            const activeResponses = responseSystem.getActiveResponses();

            expect(activeResponses.some(r => r.id === 'crash')).toBe(true);
            expect(effects.mutationRate).toBeGreaterThan(1.0);
            expect(effects.resistanceFactor).toBeLessThan(1.0);
        });
    });

    describe('High Volatility Response', () => {
        test('should respond to high volatility conditions', () => {
            const marketState = {
                trend: 0.15, // Moderate trend
                volatility: 0.75, // High volatility
                volume: 0.6
            };

            const effects = responseSystem.processMarketUpdate(marketState);
            const activeResponses = responseSystem.getActiveResponses();

            expect(activeResponses.some(r => r.id === 'high_volatility')).toBe(true);
            expect(effects.mutationRate).toBeGreaterThan(1.0);
            expect(effects.spreadRate).toBeGreaterThan(0);
            expect(effects.recoveryRate).toBeGreaterThan(1.0);
        });
    });

    describe('Strong Growth Response', () => {
        test('should detect strong growth conditions', () => {
            const marketState = {
                trend: 0.35, // Strong positive trend
                volatility: 0.3, // Moderate volatility
                volume: 0.6 // Medium volume
            };

            const effects = responseSystem.processMarketUpdate(marketState);
            const activeResponses = responseSystem.getActiveResponses();

            expect(activeResponses.some(r => r.id === 'strong_growth')).toBe(true);
            expect(effects.spreadRate).toBeGreaterThan(1.0);
            expect(effects.resistanceFactor).toBeGreaterThan(1.0);
        });
    });

    describe('Market Stabilization', () => {
        test('should detect stable market conditions', () => {
            const marketState = {
                trend: 0.05, // Low trend
                volatility: 0.2, // Low volatility
                volume: 0.4
            };

            const effects = responseSystem.processMarketUpdate(marketState);
            const activeResponses = responseSystem.getActiveResponses();

            expect(activeResponses.some(r => r.id === 'stabilization')).toBe(true);
            expect(effects.mutationRate).toBeLessThanOrEqual(1.0);
            expect(effects.spreadRate).toBeCloseTo(1.0);
        });
    });

    describe('Response History', () => {
        test('should maintain response history', () => {
            const marketStates = [
                { trend: -0.35, volatility: 0.8, volume: 0.9 }, // Crash
                { trend: 0.15, volatility: 0.75, volume: 0.6 }, // High volatility
                { trend: 0.35, volatility: 0.3, volume: 0.6 }   // Strong growth
            ];

            marketStates.forEach(state => {
                responseSystem.processMarketUpdate(state);
            });

            const history = responseSystem.getResponseHistory();
            expect(history.length).toBe(3);
            expect(history[0].marketState.trend).toBe(-0.35);
            expect(history[2].marketState.trend).toBe(0.35);
        });

        test('should limit history size', () => {
            // Generate 150 updates
            for (let i = 0; i < 150; i++) {
                responseSystem.processMarketUpdate({
                    trend: 0.1,
                    volatility: 0.3,
                    volume: 0.5
                });
            }

            const history = responseSystem.getResponseHistory();
            expect(history.length).toBe(100); // Maximum history size
        });
    });

    describe('Combined Effects', () => {
        test('should combine multiple active responses', () => {
            // Create conditions that trigger multiple responses
            const marketState = {
                trend: -0.35, // Triggers crash
                volatility: 0.75, // Triggers high volatility
                volume: 0.85
            };

            const effects = responseSystem.processMarketUpdate(marketState);
            const activeResponses = responseSystem.getActiveResponses();

            // Should have at least one response
            expect(activeResponses.length).toBeGreaterThan(0);

            // Combined effects should be within limits
            expect(effects.mutationRate).toBeLessThanOrEqual(3.0);
            expect(effects.resistanceFactor).toBeLessThanOrEqual(2.0);
            expect(effects.spreadRate).toBeLessThanOrEqual(2.0);
            expect(effects.recoveryRate).toBeLessThanOrEqual(2.0);
        });

        test('should respect minimum effect values', () => {
            // Create extreme market conditions
            const marketState = {
                trend: -0.5,
                volatility: 0.9,
                volume: 0.95
            };

            const effects = responseSystem.processMarketUpdate(marketState);

            // Effects should not go below minimum values
            expect(effects.mutationRate).toBeGreaterThanOrEqual(0.2);
            expect(effects.resistanceFactor).toBeGreaterThanOrEqual(0.3);
            expect(effects.spreadRate).toBeGreaterThanOrEqual(0.2);
            expect(effects.recoveryRate).toBeGreaterThanOrEqual(0.5);
        });
    });

    describe('Response Cleanup', () => {
        beforeEach(() => {
            // Override response durations for testing
            responseSystem.responseRules.forEach(rule => {
                rule.duration = 50; // 50ms duration for testing
            });
        });

        test('should remove expired responses', async () => {
            // Add responses with short duration
            const marketState = {
                trend: -0.35,
                volatility: 0.8,
                volume: 0.9
            };

            responseSystem.processMarketUpdate(marketState);
            const initialCount = responseSystem.getActiveResponses().length;
            expect(initialCount).toBeGreaterThan(0);

            // Wait for responses to expire
            await new Promise(resolve => setTimeout(resolve, 60));

            // Process new update to trigger cleanup
            responseSystem.processMarketUpdate({
                trend: 0.05,
                volatility: 0.15,
                volume: 0.5
            });

            const finalResponses = responseSystem.getActiveResponses();
            expect(finalResponses.length).toBeGreaterThan(0);
            expect(finalResponses.some(r => r.id === 'stabilization')).toBe(true);
        });

        test('should clear history and responses', () => {
            // Add some responses
            responseSystem.processMarketUpdate({
                trend: -0.35,
                volatility: 0.8,
                volume: 0.9
            });

            expect(responseSystem.getResponseHistory().length).toBeGreaterThan(0);
            expect(responseSystem.getActiveResponses().length).toBeGreaterThan(0);

            // Clear everything
            responseSystem.clearHistory();

            expect(responseSystem.getResponseHistory().length).toBe(0);
            expect(responseSystem.getActiveResponses().length).toBe(0);
        });
    });
}); 