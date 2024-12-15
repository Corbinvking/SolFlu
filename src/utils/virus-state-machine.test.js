import VirusStateMachine from './virus-state-machine';

describe('VirusStateMachine', () => {
    let virusStateMachine;
    
    beforeEach(() => {
        virusStateMachine = new VirusStateMachine();
    });

    describe('Market State Integration', () => {
        const sampleMarketData = {
            marketCap: 500000,
            volatility: 0.3,
            volume: 100000,
            recentPrices: [100, 105, 103, 107, 110]
        };

        test('should update market state with all metrics', () => {
            const state = virusStateMachine.updateMarketState(sampleMarketData);
            
            expect(state.trend).toBeDefined();
            expect(state.strength).toBeDefined();
            expect(state.volatility).toBe(0.3);
            expect(state.momentum).toBeDefined();
            expect(state.volume).toBeDefined();
            expect(state.sentiment).toBeDefined();
        });

        test('should calculate momentum correctly', () => {
            const momentum = virusStateMachine.calculateMomentum(sampleMarketData);
            expect(momentum).toBeDefined();
            expect(momentum).toBeLessThanOrEqual(1);
            expect(momentum).toBeGreaterThanOrEqual(-1);
        });

        test('should calculate sentiment within valid range', () => {
            virusStateMachine.updateMarketState(sampleMarketData);
            expect(virusStateMachine.marketState.sentiment).toBeLessThanOrEqual(1);
            expect(virusStateMachine.marketState.sentiment).toBeGreaterThanOrEqual(-1);
        });
    });

    describe('Growth Patterns', () => {
        test('should update pattern weights based on market conditions', () => {
            virusStateMachine.updateMarketState({
                marketCap: 500000,
                volatility: 0.5,
                volume: 100000,
                recentPrices: [100, 110, 120]
            });

            expect(virusStateMachine.patterns.exponential.weight).toBeDefined();
            expect(virusStateMachine.patterns.linear.weight).toBeDefined();
            expect(virusStateMachine.patterns.clustered.weight).toBeDefined();
        });
    });

    describe('Adaptation Mechanics', () => {
        test('should update adaptation metrics based on market conditions', () => {
            const initialResistance = virusStateMachine.adaptation.resistanceFactor;
            
            virusStateMachine.updateMarketState({
                marketCap: 800000,
                volatility: 0.4,
                volume: 150000,
                recentPrices: [100, 120, 140]
            });

            expect(virusStateMachine.adaptation.resistanceFactor).not.toBe(initialResistance);
            expect(virusStateMachine.adaptation.recoveryRate).toBeGreaterThan(0);
            expect(virusStateMachine.adaptation.mutationProbability).toBeGreaterThan(0);
        });
    });

    describe('Market Response', () => {
        test('should handle market growth appropriately', () => {
            const initialGrowthRate = virusStateMachine.growthParams.baseGrowthRate;
            
            virusStateMachine.updateMarketState({
                marketCap: 1000000,
                volatility: 0.2,
                volume: 200000,
                recentPrices: [100, 110, 120, 130]
            });

            expect(virusStateMachine.growthParams.baseGrowthRate).toBeGreaterThan(initialGrowthRate);
        });

        test('should handle market decline appropriately', () => {
            // Initialize with some points
            virusStateMachine.initializeFromCenters([
                { lat: 0, lng: 0 },
                { lat: 1, lng: 1 }
            ]);

            const initialPoints = virusStateMachine.growthFrontier.size;
            
            virusStateMachine.updateMarketState({
                marketCap: 100000, // Lower than previous to trigger decline
                volatility: 0.6,
                volume: 300000,
                recentPrices: [100, 90, 80, 70]
            });

            // Should have removed some points due to decline
            expect(virusStateMachine.growthFrontier.size).toBeLessThanOrEqual(initialPoints);
        });
    });
}); 